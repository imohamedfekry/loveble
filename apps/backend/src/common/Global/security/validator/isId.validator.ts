import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import * as v from 'valibot';

export const snowflakeId = v.pipe(
  v.string('ID must be a string'),
  v.regex(/^\d{16,19}$/, 'Invalid ID'),
  v.transform((value) => BigInt(value)),
);

@Injectable()
export class ParseSnowflakePipe implements PipeTransform<string, bigint> {
  transform(value: string): bigint {
    if (!/^\d{16,19}$/.test(value)) {
      throw new BadRequestException('Invalid ID');
    }

    return BigInt(value);
  }
}
