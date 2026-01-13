import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    // 1. Validate email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // 2. Hash password before storing
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 3. Create organization and user in a single transaction (atomicity)
    const result = await this.prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: registerDto.organizationName,
        },
      });

      // Create user with OWNER role
      const user = await tx.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          name: registerDto.name,
          role: UserRole.OWNER,
          organizationId: organization.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
        },
      });

      return user;
    });

    // 4. Generate JWT and return auth response
    return this.generateTokens(
      result.id,
      result.name,
      result.email,
      result.role,
      result.organizationId,
    );
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(
      user.id,
      user.name,
      user.email,
      user.role,
      user.organizationId,
    );
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  private generateTokens(
    userId: string,
    name: string,
    email: string,
    role: UserRole,
    organizationId: string,
  ) {
    const payload = { sub: userId, name, email, role, organizationId };

    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: userId, name, email, role, organizationId },
    };
  }
}
