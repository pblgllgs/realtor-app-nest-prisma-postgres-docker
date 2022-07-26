import { UserType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @Matches(/^(\+?56)?(\s?)(0?9)(\s?)[98765432]\d{7}$/, {
    message: 'Phone number is not valid',
  })
  phone: string;
  @IsEmail()
  email: string;
  @IsString()
  @MinLength(5)
  password: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  productKey?: string;
}

export class SigninDto {
  @IsEmail()
  email: string;
  @IsString()
  password: string;
}

export class GenerateProductKeyDto {
  @IsString()
  email: string;
  @IsEnum(UserType)
  userType: UserType;
}
