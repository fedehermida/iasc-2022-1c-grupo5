import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ClientService {

  constructor(
    private readonly httpService: HttpService
  ) {}
  }