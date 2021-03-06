import { LoginController } from './login'
import {
  badRequest,
  ok,
  serverError,
  unauthorized
} from '../../helpers/http-helper'
import { InvalidParamError, MissingParamError } from '../../errors'
import { EmailValidator, HttpRequest, Authentication } from './login-protocols'

interface SutTypes {
  sut: LoginController
  emailValidatorStub: EmailValidator
  authenticationStub: Authentication
}

const makeEmailValidator = (): EmailValidator => {
  class EmailValidatorStub implements EmailValidator {
    isValid(email: string): boolean {
      return true
    }
  }

  return new EmailValidatorStub()
}

const makeFakeRequest = (): HttpRequest => ({
  body: {
    email: 'any_email@mail.com',
    password: 'any_password'
  }
})

const makeAuthentication = (): Authentication => {
  class AuthenticationStub implements Authentication {
    async auth(email: string, password: string): Promise<string> {
      return 'any_token'
    }
  }

  return new AuthenticationStub()
}

const makeSut = (): SutTypes => {
  const emailValidatorStub = makeEmailValidator()
  const authenticationStub = makeAuthentication()
  const sut = new LoginController(emailValidatorStub, authenticationStub)
  return {
    sut,
    emailValidatorStub,
    authenticationStub
  }
}

describe('Login Controller', () => {
  test('Sould return 400 if no email is provided', async () => {
    const { sut } = makeSut()
    const httpRequest = {
      body: {
        password: 'any_password'
      }
    }
    const httpResponse = await sut.handle(httpRequest)

    expect(httpResponse.statusCode).toBe(400)
    expect(httpResponse).toEqual(badRequest(new MissingParamError('email')))
  })

  test('Sould return 400 if no password is provided', async () => {
    const { sut } = makeSut()
    const httpRequest = {
      body: {
        email: 'any_email@mail.com'
      }
    }
    const httpResponse = await sut.handle(httpRequest)

    expect(httpResponse.statusCode).toBe(400)
    expect(httpResponse).toEqual(badRequest(new MissingParamError('password')))
  })

  test('Sould return 400 if an invalid email is provided', async () => {
    const { sut, emailValidatorStub } = makeSut()
    jest.spyOn(emailValidatorStub, 'isValid').mockReturnValueOnce(false)
    const httpResponse = await sut.handle(makeFakeRequest())

    expect(httpResponse.statusCode).toBe(400)
    expect(httpResponse).toEqual(badRequest(new InvalidParamError('email')))
  })

  test('Sould call EmailValidator with correct email', async () => {
    const { sut, emailValidatorStub } = makeSut()
    const isValidSpy = jest.spyOn(emailValidatorStub, 'isValid')
    await sut.handle(makeFakeRequest())

    expect(isValidSpy).toHaveBeenCalledWith('any_email@mail.com')
  })

  test('Sould return 500 if EmailValidator throws', async () => {
    const { sut, emailValidatorStub } = makeSut()
    jest.spyOn(emailValidatorStub, 'isValid').mockImplementationOnce(() => {
      throw new Error()
    })
    const httpResponse = await sut.handle(makeFakeRequest())

    expect(httpResponse).toEqual(serverError(new Error()))
  })

  test('Sould call Authentication with correct values', async () => {
    const { sut, authenticationStub } = makeSut()
    const authSpy = jest.spyOn(authenticationStub, 'auth')
    await sut.handle(makeFakeRequest())

    expect(authSpy).toHaveBeenCalledWith('any_email@mail.com', 'any_password')
  })

  test('Sould return 401 if invalid credentials are provided', async () => {
    const { sut, authenticationStub } = makeSut()
    jest.spyOn(authenticationStub, 'auth').mockReturnValueOnce(null)
    const httpResponse = await sut.handle(makeFakeRequest())

    expect(httpResponse).toEqual(unauthorized())
  })

  test('Sould return 500 if Authentication throws', async () => {
    const { sut, authenticationStub } = makeSut()
    jest.spyOn(authenticationStub, 'auth').mockImplementationOnce(() => {
      throw new Error()
    })
    const httpResponse = await sut.handle(makeFakeRequest())

    expect(httpResponse).toEqual(serverError(new Error()))
  })

  test('Sould return 200 if valid credentials are provided', async () => {
    const { sut } = makeSut()

    const httpResponse = await sut.handle(makeFakeRequest())

    expect(httpResponse).toEqual(ok({ accessToken: 'any_token' }))
  })
})
