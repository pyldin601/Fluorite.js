import User from './User';
import fluorite from '../services/fluorite';

export default class Address extends fluorite.Model {
  static table = 'addresses';
  static columns = ['id', 'street', 'building', 'flat'];

  users() {
    return this.belongsToMany(User);
  }
}
