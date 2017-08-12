import User from './User';
import fluorite from '../services/fluorite';

export default class Address extends fluorite.Model {
  static table = 'addresses';

  users() {
    return this.belongsToMany(User);
  }
}
