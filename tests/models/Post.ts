import fluorite from '../services/fluorite';

export default class Post extends fluorite.Model<Post> {
  static table = 'posts';
  static columns = ['id', 'title', 'user_id'];
}
