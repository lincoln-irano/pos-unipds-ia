import tf from "@tensorflow/tfjs-node";

async function trainModel(inputXs, outputYs) {
	const model = tf.sequential();

	// Primeira camada da rede:
	// Entrada de 7 posições (idade normalizada, 3 cores, 3 localizaçoes)

	// 80 neurônios =  colocamos 80 por conta de pouca base de treino
	// quanto mais neurônios, mais complexidade a rede pode aprender
	// e consequentemente, mais processamento vai usar

	// a ReLU age como filtro:
	// É como se ela deixasse apenas os dados interessantes seguir viagem na rede
	// se a info chegou nesse neurônio é positiva, passa para frente
	// se a info for zero, pode jogar fora que não servirá
	model.add(
		tf.layers.dense({ inputShape: [7], units: 80, activation: "relu" }),
	);

	// Saída: 3 neurônios
	//  um para cada categoria (premium, mediym, basic)

	// Activation: softmax normaliza a saída em probabilidades
	model.add(tf.layers.dense({ units: 3, activation: "softmax" }));

	// Compilando o modelo
	// optmizer Adam (Adaptive Moment Estimation)
	// é um treinador pessoal oderno para redes neurais:
	// ajusta os pesos de forma eficiente e inteligente aprendendo com histórico de erros e acertos

	// loss: categoricalCrossentropy
	// Ele compara o modelo "acha" (os scores de cada caregoria) com a resposta certa
	// a categoria premium será sempre [1, 0, 0]

	// quanto mais distante da previsão do modelo, maior o loss
	// exemplo classico: classificação de imagens, recomendação, categoriação de users
	// qualquer coisa em que a resposta certa é "apenas uma entre várias possíveis"
	model.compile({
		optimizer: "adam",
		loss: "categoricalCrossentropy",
		metrics: ["accuracy"],
	});

	// Treinamento do modelo
	// verbose: desabilita o log interno (e usa só callbase)
	// epochs quantidade de vezes que vai rodar no dataset
	// shuffle embaralha os dados para evitar viés
	await model.fit(inputXs, outputYs, {
		verbose: 0,
		epochs: 100,
		shuffle: true,
		callbacks: {
			// onEpochEnd: (epoch, log) => {
			// 	console.log(`Epoch: ${epoch} - loss: ${log.loss}`);
			// },
		},
	});

	return model;
}

async function predict(model, person) {
	// transformar o array js para o tensor
	const tfInput = tf.tensor2d(person);

	// faz a predição (output será um vetor de 3 possibilidades)
	const pred = model.predict(tfInput);
	const predArray = await pred.array();

	return predArray[0].map((prob, index) => ({ prob, index }));
}

// Exemplo de pessoas para treino (cada pessoa com idade, cor e localização)
// const pessoas = [
//     { nome: "Erick", idade: 30, cor: "azul", localizacao: "São Paulo" },
//     { nome: "Ana", idade: 25, cor: "vermelho", localizacao: "Rio" },
//     { nome: "Carlos", idade: 40, cor: "verde", localizacao: "Curitiba" }
// ];

// Vetores de entrada com valores já normalizados e one-hot encoded
// Ordem: [idade_normalizada, azul, vermelho, verde, São Paulo, Rio, Curitiba]
// const tensorPessoas = [
//     [0.33, 1, 0, 0, 1, 0, 0], // Erick
//     [0, 0, 1, 0, 0, 1, 0],    // Ana
//     [1, 0, 0, 1, 0, 0, 1]     // Carlos
// ]

// Usamos apenas os dados numéricos, como a rede neural só entende números.
// tensorPessoasNormalizado corresponde ao dataset de entrada do modelo.
const tensorPessoasNormalizado = [
	[0.33, 1, 0, 0, 1, 0, 0], // Erick
	[0, 0, 1, 0, 0, 1, 0], // Ana
	[1, 0, 0, 1, 0, 0, 1], // Carlos
];

// Labels das categorias a serem previstas (one-hot encoded)
// [premium, medium, basic]
const labelsNomes = ["premium", "medium", "basic"]; // Ordem dos labels
const tensorLabels = [
	[1, 0, 0], // premium - Erick
	[0, 1, 0], // medium - Ana
	[0, 0, 1], // basic - Carlos
];

// Criamos tensores de entrada (xs) e saída (ys) para treinar o modelo
const inputXs = tf.tensor2d(tensorPessoasNormalizado);
const outputYs = tf.tensor2d(tensorLabels);

// quanto mais dados melhor, assim o algoritmo consegue entender melhor os padrões mais complexos
const model = await trainModel(inputXs, outputYs);

// const newPerson = {
// 	nome: "zé",
// 	idade: 28,
// 	cor: "verde",
// 	localizacao: "Curitiba",
// };
// Normalizando a nova pessoa usando o mesmo padrão do treino
// Ex: idade_min = 25, idade_max = 40, entao (28-25)/40-25 = 0.2

const tensorPersonNormalized = [[0.2, 1, 0, 0, 1, 0, 0]];

const predictions = await predict(model, tensorPersonNormalized);
const results = predictions
	.sort((a, b) => b.prob - a.prob)
	.map((p) => `${labelsNomes[p.index]} (${(p.prob * 100).toFixed(2)}%)`)
	.join("\n");

console.log(results);
