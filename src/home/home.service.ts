import { UserInfo } from './../user/decorators/user.decorator';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HomeResponseDto } from './dto/home.dto';
import { PropertyType } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

interface GetHomesParam {
  city?: string;
  price?: {
    gte?: number;
    lte?: number;
  };
  propertyType?: PropertyType;
}

const homeSelect = {
  id: true,
  address: true,
  city: true,
  price: true,
  property_type: true,
  number_of_bathrooms: true,
  number_of_bedrooms: true,
};

interface CreateHomeParams {
  address: string;
  numberOfBedrooms: number;
  numberOfBathrooms: number;
  city: string;
  price: number;
  landSize: number;
  propertyType: PropertyType;
  images: { url: string }[];
}
interface UpdateHomeParams {
  address?: string;
  numberOfBedrooms?: number;
  numberOfBathrooms?: number;
  city?: string;
  price?: number;
  landSize?: number;
  propertyType?: PropertyType;
}

cloudinary.config({
  cloud_name: 'pblgllgs',
  api_key: '831823878865517',
  api_secret: 'eK0pws_QG65SQmNAgDBKnXMolYM',
  secure: true,
});

@Injectable()
export class HomeService {
  constructor(private readonly prismaService: PrismaService) {}
  async getHomes(filter: GetHomesParam): Promise<HomeResponseDto[]> {
    const homes = await this.prismaService.home.findMany({
      select: {
        ...homeSelect,
        images: {
          select: {
            url: true,
          },
          take: 1,
        },
      },
      where: filter,
    });
    if (!homes.length) {
      throw new NotFoundException('No homes found');
    }
    return homes.map((home) => {
      const fetchHome = { ...home, image: home.images[0].url };
      delete fetchHome.images;
      return new HomeResponseDto(fetchHome);
    });
  }

  async getHomeById(id: number): Promise<HomeResponseDto> {
    const home = await this.prismaService.home.findUnique({
      select: {
        ...homeSelect,
        images: {
          select: {
            url: true,
          },
          take: 1,
        },
        realtor: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      where: { id },
    });
    if (!home) {
      throw new NotFoundException('No home found');
    }
    return new HomeResponseDto(home);
  }
  async createHome(
    {
      address,
      city,
      price,
      numberOfBathrooms,
      numberOfBedrooms,
      landSize,
      propertyType,
      images,
    }: CreateHomeParams,
    userId: number,
  ): Promise<HomeResponseDto> {
    const home = await this.prismaService.home.create({
      data: {
        address,
        city,
        price,
        number_of_bathrooms: numberOfBathrooms,
        number_of_bedrooms: numberOfBedrooms,
        land_size: landSize,
        property_type: propertyType,
        realtor_id: userId,
      },
    });

    const homeImages = images.map((image) => {
      return { ...image, home_id: home.id };
    });
    await this.prismaService.image.createMany({
      data: homeImages,
    });
    return new HomeResponseDto(home);
  }
  async updateHome(
    id: number,
    data: UpdateHomeParams,
  ): Promise<HomeResponseDto> {
    const home = await this.prismaService.home.findUnique({
      where: { id },
    });
    if (!home) {
      throw new NotFoundException('No home found');
    }
    const updatedHome = await this.prismaService.home.update({
      where: { id },
      data: {
        ...data,
      },
    });
    console.log(data);
    return new HomeResponseDto(updatedHome);
  }
  async deleteHome(id: number): Promise<void> {
    const home = await this.prismaService.home.findUnique({
      where: { id },
    });
    if (!home) {
      throw new NotFoundException('No home found');
    }
    const imagesHomeToDelete = await this.prismaService.image.findMany({
      where: { home_id: home.id },
    });
    const urlsArrayToDelete = imagesHomeToDelete.map((image) => image.url);
    const idsArrayToDelete = urlsArrayToDelete.map(
      (url) =>
        `homes/` + url.split('/')[url.split('/').length - 1].split('.')[0],
    );
    await cloudinary.api.delete_resources(
      idsArrayToDelete,
      function (error, result) {
        console.log(result);
      },
    );
    await this.prismaService.image.deleteMany({
      where: { home_id: id },
    });

    await this.prismaService.home.delete({ where: { id } });
  }

  async getRealtorByHomeId(id: number) {
    const home = await this.prismaService.home.findUnique({
      where: { id },
      select: {
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    if (!home) {
      throw new NotFoundException('No home found');
    }
    return home.realtor;
  }

  async inquire(buyer: UserInfo, homeId: number, message: string) {
    const realtor = await this.getRealtorByHomeId(homeId);
    return await this.prismaService.message.create({
      data: {
        realtor_id: realtor.id,
        buyer_id: buyer.id,
        home_id: homeId,
        message,
      },
    });
  }

  async getMessagesByHome(homeId: number) {
    return await this.prismaService.message.findMany({
      where: {
        home_id: homeId,
      },
      select: {
        message: true,
        buyer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }
}
