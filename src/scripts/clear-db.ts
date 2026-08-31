import { prisma } from "../configs";

async function clearDatabase() {
  console.log("Starting cleanup...");

 await prisma.questionUsage.deleteMany();

await prisma.testAttemptAnswer.deleteMany();
await prisma.testAttempt.deleteMany();

await prisma.question.deleteMany();
await prisma.topic.deleteMany();

await prisma.test.deleteMany();

await prisma.categorySubject.deleteMany();


await prisma.subject.deleteMany();
await prisma.category.deleteMany();

  console.log("✅ Exam data deleted");
}

clearDatabase()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });