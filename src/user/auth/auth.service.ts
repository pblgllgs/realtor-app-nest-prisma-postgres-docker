import { ConflictException, HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserType } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

interface SignupParams {
  email: string;
  password: string;
  name: string;
  phone: string;
}
interface SigninParams {
  email: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService) {}
  async signup(
    { email, password, name, phone }: SignupParams,
    userType: UserType,
  ) {
    const user = await this.existUserWithEmail(email);
    if (user) {
      throw new ConflictException('User already exist');
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = await this.prismaService.user.create({
      data: {
        email,
        password: hashPassword,
        name,
        phone,
        user_type: userType,
      },
    });
    const token = await this.generateJWT(newUser.name, newUser.id);
    return token;
  }
  async signin({ email, password }: SigninParams) {
    const user = await this.existUserWithEmail(email);
    if (!user) {
      throw new HttpException('Invalid credentials', 400);
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new HttpException('Invalid credentials', 400);
    }
    const token = await this.generateJWT(user.name, user.id);
    return token;
  }

  private async generateJWT(name: string, id: number) {
    return await jwt.sign({ name, id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });
  }
  private async existUserWithEmail(email: string) {
    return await this.prismaService.user.findUnique({
      where: {
        email: email,
      },
    });
  }
  generateProductKey(email: string, userType: UserType) {
    const string = `${email}-${userType}-${process.env.PRODUCT_KEY_SECRET}`;
    return bcrypt.hash(string, 10);
  }
}
