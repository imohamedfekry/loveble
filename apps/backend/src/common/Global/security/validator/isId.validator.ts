// import {
//   registerDecorator,
//   ValidationArguments,
//   ValidationOptions,
//   ValidatorConstraint,
//   ValidatorConstraintInterface,
// } from 'class-validator';

// @ValidatorConstraint({ async: false })
// export class IsIdConstraint implements ValidatorConstraintInterface {
//   validate(value: any): boolean {
//     const str = String(value);
//     return /^\d{16,19}$/.test(str);
//   }

//   defaultMessage(args: ValidationArguments) {
//     return `${args.property} must be a valid ID (16-19 digits)`;
//   }
// }

// export function IsId(validationOptions?: ValidationOptions) {
//   return function (object: object, propertyName: string) {
//     registerDecorator({
//       target: object.constructor,
//       propertyName,
//       options: validationOptions,
//       constraints: [],
//       validator: IsIdConstraint,
//     });
//   };
// }
