import Thing from './Thing';
import Address from './Address';
import fluorite from '../services/fluorite';

export default class User extends fluorite.Model {
  static table = 'users';

  things() {
    return this.hasMany(Thing);
  }

  addresses() {
    return this.belongsToMany(Address);
  }
}
