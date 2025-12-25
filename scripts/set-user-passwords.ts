import { prisma } from "../lib/prisma"

/**
 * Set passwords for existing users
 * This is a one-time script to set passwords for users created before authentication was implemented
 */
async function setUserPasswords() {
  try {
    // Set password for k2naysaa@gmail.com
    const user1 = await prisma.user.update({
      where: { email: "k2naysaa@gmail.com" },
      data: { password: "password123" }, // Change this to a secure password
    })
    console.log(`Set password for ${user1.email}`)

    // Set password for test@gmail.com
    const user2 = await prisma.user.update({
      where: { email: "test@gmail.com" },
      data: { password: "password123" }, // Change this to a secure password
    })
    console.log(`Set password for ${user2.email}`)

    console.log("Passwords set successfully!")
    console.log("\nDefault passwords set to: password123")
    console.log("Users should change their passwords after first login.")
  } catch (error) {
    console.error("Error setting passwords:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

setUserPasswords()

