import { seedDatabase } from "./seedHelper.ts";

async function insertData() {
    await seedDatabase();
}

await insertData();