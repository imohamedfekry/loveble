import { Module } from "@nestjs/common";
import { TempUserRepository } from "./user/tempUser.repository";
import { UserRepository } from "./user/user.repository";


@Module({
    providers: [UserRepository, TempUserRepository],
    exports: [UserRepository, TempUserRepository],
})
export class RepositoryModule {}