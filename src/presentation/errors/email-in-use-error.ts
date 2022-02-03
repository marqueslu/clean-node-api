export class EmailInUseError extends Error {
  constructor() {
    super('The receibed email is already in use')
    this.name = 'EmailInUseError'
  }
}
