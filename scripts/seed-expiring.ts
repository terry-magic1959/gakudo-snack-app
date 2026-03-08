import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const snack = await prisma.snack.create({
        data: {
            name: "【検証用】賞味期限間近のおやつ",
            category: "BISCUIT",
            currentStock: 5,
            unit: "枚",
            expirationDate: tomorrow,
        }
    });
    console.log("Test snack created:", snack);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
