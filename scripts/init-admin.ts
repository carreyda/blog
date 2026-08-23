import 'dotenv/config'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import argon2 from 'argon2'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

function questionHidden(message: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('请在交互式终端中运行此命令')
  }

  stdout.write(message)
  stdin.setEncoding('utf8')
  stdin.setRawMode(true)
  stdin.resume()

  return new Promise((resolve, reject) => {
    let value = ''

    const cleanup = () => {
      stdin.off('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
    }

    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === '\r' || character === '\n') {
          cleanup()
          stdout.write('\n')
          resolve(value)
          return
        }

        if (character === '\u0003') {
          cleanup()
          stdout.write('\n')
          reject(new Error('已取消'))
          return
        }

        if (character === '\b' || character === '\u007f') {
          value = value.slice(0, -1)
          continue
        }

        if (character >= ' ') value += character
      }
    }

    stdin.on('data', onData)
  })
}

const prompt = createInterface({ input: stdin, output: stdout })
const username = (await prompt.question('管理员用户名: ')).trim().toLowerCase()
prompt.close()
const password = await questionHidden('管理员密码（至少 12 位，输入时不会显示）: ')

if (!username || username.length > 50) throw new Error('用户名长度必须为 1～50 个字符')
if (password.length < 12 || password.length > 200) throw new Error('密码长度必须为 12～200 个字符')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
const passwordHash = await argon2.hash(password, { type: argon2.argon2id })

await prisma.user.upsert({
  where: { username },
  update: { passwordHash, role: 'ADMIN', sessions: { deleteMany: {} } },
  create: { username, passwordHash, role: 'ADMIN' },
})

await prisma.$disconnect()
stdout.write('管理员账号已创建或更新，旧 Session 已失效。\n')
