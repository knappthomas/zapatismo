import { MainPO } from '../../../page-objects/MainPO';

export class UsersOverviewPO extends MainPO {
  constructor() {
    super('[data-cy="users-overview"]');
  }

  get createUserLink() {
    return this.root.find('[data-cy="user-create-link"]');
  }

  get successAlert() {
    return this.root.find('[data-cy="users-success-alert"]');
  }

  get errorAlert() {
    return this.root.find('[data-cy="users-error-alert"]');
  }

  get usersTableWrapper() {
    return this.root.find('[data-cy="users-table-wrapper"]');
  }
}
