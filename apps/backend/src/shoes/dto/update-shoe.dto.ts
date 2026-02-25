import { PartialType } from '@nestjs/swagger';
import { CreateShoeDto } from './create-shoe.dto';

export class UpdateShoeDto extends PartialType(CreateShoeDto) {}
