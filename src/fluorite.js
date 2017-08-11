import model from './model';

export default (knex) => ({
  Model: model(knex),
});
