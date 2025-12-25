import { prisma } from "../lib/prisma"

async function updateUsers() {
  try {
    // Update or create user with email k2naysaa@gmail.com
    const user1 = await prisma.user.upsert({
      where: { email: "k2naysaa@gmail.com" },
      update: { name: "xuji" },
      create: {
        email: "k2naysaa@gmail.com",
        name: "xuji",
        password: "placeholder-password-hash", // You'll need to set a proper password
      },
    })
    console.log("Updated user:", user1.email, "->", user1.name)

    // Update or create user with email test@gmail.com
    const user2 = await prisma.user.upsert({
      where: { email: "test@gmail.com" },
      update: { name: "testaccount" },
      create: {
        email: "test@gmail.com",
        name: "testaccount",
        password: "placeholder-password-hash", // You'll need to set a proper password
      },
    })
    console.log("Updated user:", user2.email, "->", user2.name)

    console.log("Users updated successfully!")
  } catch (error) {
    console.error("Error updating users:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

updateUsers()

