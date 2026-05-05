import bcrypt from 'bcrypt'

export const verifyPassword = (password: string, hash: string) => {
  return bcrypt.compareSync(password, hash)
}

export const hashPassword = (password: string) => {
  return bcrypt.hashSync(password, 10)
}
