import Thing from './Thing';
import Address from './Address';
import Post from './Post';
import fluorite from '../services/fluorite';
import * as Fluorite from '../../src';

export default class User extends fluorite.Model<User> {
  static table = 'users';
  static columns = ['id', 'name'];

  things() {
    return this.hasMany(Thing);
  }

  addresses() {
    return this.belongsToMany(Address);
  }

  posts() {
    return this.hasMany(Post);
  }
}
