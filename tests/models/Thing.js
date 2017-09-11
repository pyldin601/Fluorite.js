import User from './User';
import fluorite from '../services/fluorite';

export default class Thing extends fluorite.Model {
  static table = 'things';
  static columns = ['id', 'name', 'user_id'];

  user() {
    return this.belongsTo(User);
  }
}
