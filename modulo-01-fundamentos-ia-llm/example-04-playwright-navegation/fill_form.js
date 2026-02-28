const { chromium } = require("playwright");

async function ensurePortuguese(page) {
	try {
		const langButton = await page.$("text=Select language");
		if (langButton) {
			await langButton.click();
			const ptOption = await page.$("text=Português");
			if (ptOption) {
				await ptOption.click();
				await page.waitForLoadState("networkidle");
				return true;
			}
		}
	} catch (e) {}
	return false;
}

async function extractSpeaker(page) {
	const name = (await page.textContent("h1"))?.trim() || "";
	let location = "";
	try {
		location = (await page.textContent("text=/São Paulo|Brazil/")) || "";
	} catch (e) {}
	let bio = "";
	const bioEl = await page.$("div:has(h1) p, section p, .bio, .speaker-bio");
	if (bioEl) bio = (await bioEl.textContent()).trim();

	const sessions = await page.$$eval('a[href*="/s/erickwendel/"]', (els) =>
		els.map((a) => ({ title: a.textContent.trim(), url: a.href })),
	);

	// collect profile links (LinkedIn, GitHub, Blog, etc.)
	const links = await page.$$eval('a[href^="http"]', (els) =>
		els.map((a) => ({ href: a.href, text: a.textContent.trim() })),
	);

	// choose primary link prioritizing linkedin, github, blog
	let primaryLink = "";
	const prefer = [
		"linkedin",
		"github",
		"blog",
		"youtube",
		"twitter",
		"erickwendel.com",
		"ew.academy",
	];
	for (const p of prefer) {
		const found = links.find((l) => l.href.toLowerCase().includes(p));
		if (found) {
			primaryLink = found.href;
			break;
		}
	}
	if (!primaryLink && links.length) primaryLink = links[0].href;

	// count mentions of NodeBR in page text and infer participations
	const bodyText = (await page.textContent("body")) || "";
	const nodebrMatches = (bodyText.match(/nodebr/gi) || []).length;
	// find explicit years mentioned near 'NodeBR', e.g. 'NodeBR 2019'
	const years = Array.from(
		new Set(
			Array.from(bodyText.matchAll(/nodebr[^\\d]*(\\d{4})/gi), (m) => m[1]),
		),
	);
	// count sessions that reference NodeBR
	const sessionsNodeBR = sessions.filter(
		(s) => /nodebr/i.test(s.title) || /nodebr/i.test(s.url),
	).length;
	// heuristic count: prefer explicit years, else sessions count, else presence -> 1 if mentioned
	let inferredCount = 0;
	if (years.length) inferredCount = years.length;
	else if (sessionsNodeBR) inferredCount = sessionsNodeBR;
	else if (nodebrMatches) inferredCount = 1;

	return {
		name,
		location,
		bio,
		sessions,
		links,
		primaryLink,
		nodebrCount: inferredCount,
	};
}

function isPortugueseText(text) {
	if (!text) return false;
	const lower = text.toLowerCase();
	const ptIndicators = [
		"português",
		"portugues",
		"palestra",
		"descrição",
		"descriçao",
		"descricao",
	];
	return (
		ptIndicators.some((k) => lower.includes(k)) || /[ãáéíóúâêôç]/i.test(text)
	);
}

async function findSessionInPortuguese(page, sessions) {
	for (const s of sessions) {
		if (!/javascript/i.test(s.title)) continue;
		try {
			await page.goto(s.url, { waitUntil: "networkidle" });
			const text = await page.textContent("body");
			if (isPortugueseText(text)) return s;
		} catch (e) {}
	}
	return null;
}

async function findSessionByKeywords(page, sessions, keywords) {
	for (const s of sessions) {
		// quick title check
		const titleLower = (s.title || "").toLowerCase();
		const titleMatch = keywords.every((k) =>
			titleLower.includes(k.toLowerCase()),
		);
		if (titleMatch) return s;
		// fetch session page and search content
		try {
			await page.goto(s.url, { waitUntil: "networkidle" });
			const text = ((await page.textContent("body")) || "").toLowerCase();
			const textMatch = keywords.every((k) => text.includes(k.toLowerCase()));
			if (textMatch) return s;
			// relaxed match: require presence of 'ia' and one of browser terms
			const hasIA = /\bia\b/.test(text) || titleLower.includes("ia");
			const hasBrowser =
				/browser|navegador|navegadores|web ai/.test(text) ||
				/browser|navegador|navegadores|web ai/.test(titleLower);
			if (hasIA && hasBrowser) return s;
		} catch (e) {
			// ignore and continue
		}
	}
	return null;
}

async function extractSessionDetails(page) {
	// Try several selectors to get a clean session description
	const selectors = [
		".session-description",
		".session__description",
		".session-desc",
		".session-body",
		".description",
		".content",
		"article",
		"main",
	];
	for (const sel of selectors) {
		try {
			const el = await page.$(sel);
			if (el) {
				// prefer paragraph children
				const p = await el.$("p");
				if (p) {
					const txt = (await p.textContent()) || "";
					if (txt.trim().length > 20) return txt.trim();
				}
				const txt = (await el.textContent()) || "";
				if (txt.trim().length > 20) return txt.trim();
			}
		} catch (e) {}
	}
	// fallback: first meaningful paragraph in body
	try {
		const para = await page.$("body p");
		if (para) {
			const txt = (await para.textContent()) || "";
			if (txt.trim().length > 20) return txt.trim();
		}
	} catch (e) {}
	// last resort: full body text (trimmed)
	const bodyText = (await page.textContent("body")) || "";
	return bodyText.trim().slice(0, 1200);
}

async function getFormQuestions(page) {
	const questions = await page.evaluate(() => {
		const out = [];
		const els = document.querySelectorAll(
			'div[role="listitem"], .freebirdFormviewerComponentsQuestionBaseTitle',
		);
		els.forEach((el) => {
			const titleEl =
				el.querySelector &&
				(el.querySelector(".freebirdFormviewerComponentsQuestionBaseTitle") ||
					el.querySelector("label"));
			const title = titleEl ? titleEl.innerText : el.innerText || "";
			const required =
				/obrigat|required|\*/i.test(title) ||
				!!el.querySelector('[aria-required="true"]');
			out.push({ title: title.trim(), required });
		});
		return out;
	});
	return questions.filter((q) => q.title.length > 0);
}

async function fillForm(page, mapping) {
	const containers = await page.$$('div[role="listitem"]');
	for (const c of containers) {
		const label = (await c.textContent()) || "";
		for (const key of Object.keys(mapping)) {
			if (label.toLowerCase().includes(key.toLowerCase())) {
				const input = await c.$(
					'input[type="text"], input[type="email"], textarea, input[type="tel"]',
				);
				if (input) {
					await input.fill(mapping[key]);
					await page.waitForTimeout(150);
				}
			}
		}
	}
}

async function chooseRadioOption(page, optionText) {
	// find label containing the optionText and click the related input
	const labels = await page.$$("label");
	for (const lbl of labels) {
		const txt = (await lbl.textContent()) || "";
		if (txt.trim().toLowerCase().includes(optionText.toLowerCase())) {
			try {
				// try to find associated input by 'for' attribute
				const forAttr = await lbl.getAttribute("for");
				if (forAttr) {
					const input = await page.$(`#${forAttr}`);
					if (input) {
						await input.click();
						return true;
					}
				}
				// otherwise click the label itself (which toggles the input)
				await lbl.click();
				return true;
			} catch (e) {
				// ignore and continue
			}
		}
	}
	return false;
}

(async () => {
	const browser = await chromium.launch({ headless: false });
	const page = await browser.newPage();

	await page.goto("https://sessionize.com/erickwendel", {
		waitUntil: "networkidle",
	});
	await ensurePortuguese(page);
	const speaker = await extractSpeaker(page);

	// procurar sessão relacionada a "IA em Browser" (palavras-chave em PT/EN)
	const keywords = ["ia", "browser"];
	let chosen = await findSessionByKeywords(page, speaker.sessions, keywords);
	if (!chosen) {
		console.log(
			'Nenhuma palestra correspondente a "IA em Browser" foi encontrada. Tentando fallback por "javascript"...',
		);
		// Fallback anterior: escolha qualquer sessão que contenha 'javascript' no título
		chosen = speaker.sessions.find((s) => /javascript/i.test(s.title));
		if (chosen)
			console.log(
				'Fallback: escolhida sessão com "javascript" no título (idioma não confirmado).',
			);
		else {
			console.log(
				'Nenhuma palestra com "javascript" no título foi encontrada. Abortando preenchimento.',
			);
			console.log("Dados do palestrante extraídos:", speaker);
			await browser.close();
			process.exit(0);
		}
	}

	await page.goto(chosen.url, { waitUntil: "networkidle" });
	const sessionTitle = (await page.textContent("h1"))?.trim() || chosen.title;
	const sessionDesc = (await extractSessionDetails(page)) || "";

	const formUrl = "https://forms.gle/5mGHXVKDLMFtjwBz7";
	await page.goto(formUrl, { waitUntil: "networkidle" });

	const questions = await getFormQuestions(page);
	console.log("Perguntas detectadas (amostra):", questions.slice(0, 20));

	const mapping = {
		nome: speaker.name || "",
		email: "teste@playwright.test",
		telefone: "11999999999",
		título: sessionTitle || "",
		titulo: sessionTitle || "",
		descrição: sessionDesc || "",
		descricao: sessionDesc || "",
		"mini biografia": speaker.bio || "",
		"mini-biografia": speaker.bio || "",
		"github/linkedin/blog": speaker.primaryLink || "",
		"github linkedin blog": speaker.primaryLink || "",
		nodebr: speaker.nodebrCount > 0 ? "Sim" : "Não",
		"quantas vezes": (speaker.nodebrCount || 0).toString(),
		link: chosen.url || "",
	};

	await fillForm(page, mapping);

	// marcar participação anterior como "Sim, como participante" se existir
	await chooseRadioOption(page, "Sim, como participante");
	await page.screenshot({ path: "filled_form_snapshot.png", fullPage: true });

	console.log(
		"Preenchimento concluído (sem submeter). Snapshot: filled_form_snapshot.png",
	);
	await browser.close();
})();
