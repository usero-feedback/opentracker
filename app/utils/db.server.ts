import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { AppLoadContext } from 'react-router'

export type { PrismaClient }

export function getPrisma({ context }: { context: AppLoadContext }) {
	const adapter = new PrismaD1(context.cloudflare.env.DB)
	// const prisma = new PrismaClient()
	const prisma = new PrismaClient({ adapter })
	return prisma
}
