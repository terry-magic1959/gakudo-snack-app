import { PrismaClient, OrderStatus, SnackCategory, StockMovementType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.orderBatch.deleteMany();
  await prisma.servingLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.snackPhoto.deleteMany();
  await prisma.snack.deleteMany();

  const snacks = await Promise.all([
    prisma.snack.create({
      data: {
        name: "しおせんべい",
        category: SnackCategory.SENBEI,
        unit: "袋",
        packageSize: 10,
        minStockLevel: 3,
        currentStock: 8
      }
    }),
    prisma.snack.create({
      data: {
        name: "どうぶつビスケット",
        category: SnackCategory.BISCUIT,
        unit: "箱",
        packageSize: 20,
        minStockLevel: 2,
        currentStock: 1
      }
    }),
    prisma.snack.create({
      data: {
        name: "フルーツゼリー",
        category: SnackCategory.JELLY,
        unit: "箱",
        packageSize: 12,
        minStockLevel: 4,
        currentStock: 5
      }
    })
  ]);

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  await prisma.servingLog.createMany({
    data: [
      { snackId: snacks[0].id, servings: 18, childrenCount: 22, servedDate: daysAgo(1), memo: "雨の日で少なめ" },
      { snackId: snacks[1].id, servings: 24, childrenCount: 24, servedDate: daysAgo(2), memo: "人気" },
      { snackId: snacks[2].id, servings: 16, childrenCount: 21, servedDate: daysAgo(4), memo: "冷やして提供" },
      { snackId: snacks[1].id, servings: 20, childrenCount: 23, servedDate: daysAgo(8), memo: "先週分" }
    ]
  });

  const batch = await prisma.orderBatch.create({
    data: {
      orderedDate: daysAgo(3),
      supplierName: "近所のお菓子問屋",
      requestedBy: "田中先生",
      status: OrderStatus.ORDERED,
      memo: "週次発注"
    }
  });

  await prisma.orderItem.createMany({
    data: [
      { orderBatchId: batch.id, snackId: snacks[1].id, quantity: 3, unitPrice: 380 },
      { orderBatchId: batch.id, snackId: snacks[2].id, quantity: 2, unitPrice: 420 }
    ]
  });

  await prisma.stockMovement.createMany({
    data: [
      { snackId: snacks[1].id, movementType: StockMovementType.IN, quantity: 3, reason: "発注入荷", movedAt: daysAgo(2) },
      { snackId: snacks[1].id, movementType: StockMovementType.OUT, quantity: 1, reason: "配布", movedAt: daysAgo(1) },
      { snackId: snacks[0].id, movementType: StockMovementType.OUT, quantity: 2, reason: "配布", movedAt: daysAgo(1) }
    ]
  });

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
