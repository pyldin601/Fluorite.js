import fluorite from '../services/fluorite';

export default class Post extends fluorite.Model {
  static table = 'posts';
  static columns = ['id', 'title', 'user_id'];
}
