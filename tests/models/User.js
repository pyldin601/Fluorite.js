import Thing from './Thing';
import fluorite from '../services/fluorite';

export default class User extends fluorite.Model {
  static table = 'users';

  things() {
    return this.hasMany(Thing, 'user_id', 'id');
  }
}
