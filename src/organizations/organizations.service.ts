import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async create(createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsRepository.create(createOrganizationDto);
  }

  async findAll() {
    return this.organizationsRepository.findAll();
  }

  async findById(id: string) {
    const organization = await this.organizationsRepository.findById(id);

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto) {
    await this.findById(id);
    return this.organizationsRepository.update(id, updateOrganizationDto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.organizationsRepository.delete(id);
  }
}
