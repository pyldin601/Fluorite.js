export default (modelClass) => class Query {
  constructor() {
    this.knexQuery = modelClass.knex(modelClass.table);
  }

  where(attributes) {

  }

  query(callback) {

  }

  fetchOne() {

  }

  fetchAll() {

  }

  fetchColumn(column = null) {

  }

  count(column = null) {

  }

  save(attributes) {

  }
};
