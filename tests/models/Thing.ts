import User from './User';
import fluorite from '../services/fluorite';
import * as Fluorite from '../../src';

export default class Thing extends fluorite.Model<Thing> {
  static table = 'things';
  static columns = ['id', 'name', 'user_id'];

  user() {
    return this.belongsTo(User);
  }
}
