import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../src/modules/users/users.service';
import { User } from '../src/modules/users/entities/user.entity';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: 'id-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: 'user',
    createdAt: new Date(),
    links: [],
  };

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockReturnValue(mockUser),
      save: jest.fn().mockResolvedValue(mockUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User)) as jest.Mocked<Repository<User>>;
  });

  it('should hash password on create', async () => {
    repo.findOne.mockResolvedValue(null);

    await service.create('new@example.com', 'plainPassword');

    expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
    expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword', 'salt');
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'hashed-password' }),
    );
  });

  it('should throw ConflictException when email already exists', async () => {
    repo.findOne.mockResolvedValue(mockUser);

    await expect(
      service.create('test@example.com', 'password'),
    ).rejects.toThrow(ConflictException);
  });

  it('should validate password correctly', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.validatePassword(mockUser, 'correct');

    expect(bcrypt.compare).toHaveBeenCalledWith('correct', 'hashed-password');
    expect(result).toBe(true);
  });
});
