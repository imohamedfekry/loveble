// import { IsInt, IsOptional, Min } from 'class-validator';
// import { Type } from 'class-transformer';

// /**
//  * Pagination Query DTO
//  * 
//  * Used for pagination parameters in list endpoints.
//  * - page: Current page number (1-indexed)
//  * - limit: Items per page
//  * 
//  * Why: Defines the contract for pagination queries.
//  * This ensures frontend and backend agree on pagination format.
//  */
// export class PaginationQueryDto {
//   @Type(() => Number)
//   @IsInt({ message: 'page must be an integer' })
//   @Min(1, { message: 'page must be greater than or equal to 1' })
//   page: number = 1;

//   @Type(() => Number)
//   @IsInt({ message: 'limit must be an integer' })
//   @Min(1, { message: 'limit must be greater than or equal to 1' })
//   limit: number = 10;
// }

// /**
//  * Pagination Metadata DTO
//  * 
//  * Returned with paginated responses.
//  * - total: Total number of items
//  * - page: Current page number
//  * - limit: Items per page
//  * - totalPages: Total number of pages
//  * - hasMore: Whether there are more pages
//  * 
//  * Why: Provides pagination info to frontend.
//  * Frontend can use this to know when to stop fetching.
//  */
// export class PaginationMetaDto {
//   total: number;

//   page: number;

//   limit: number;

//   totalPages: number;

//   hasMore: boolean;
// }
