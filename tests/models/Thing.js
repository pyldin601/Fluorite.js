import User from './User';
import fluorite from '../services/fluorite';

export default class Thing extends fluorite.Model {
  static table = 'things';

  user() {
    return this.belongsTo(User);
  }
}
