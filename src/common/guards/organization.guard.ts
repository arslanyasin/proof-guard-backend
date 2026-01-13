import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organizationId = request.params.organizationId || request.body.organizationId;

    if (!organizationId) {
      return true;
    }

    if (user.organizationId !== organizationId) {
      throw new ForbiddenException(
        'You do not have permission to access this organization',
      );
    }

    return true;
  }
}
