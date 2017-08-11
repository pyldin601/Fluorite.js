import User from './User';
import fluorite from '../services/fluorite';

export default class Address extends fluorite.Model {
  static table = 'addresses';

  user() {
    return this.belongsToMany(User);
  }
}
