import User from './User';
import fluorite from '../services/fluorite';
import * as Fluorite from '../../src';

export default class Address extends fluorite.Model<Address> {
  static table = 'addresses';
  static columns = ['id', 'street', 'building', 'flat'];

  users() {
    return this.belongsToMany(User);
  }
}
