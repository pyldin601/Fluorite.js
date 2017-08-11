const ops = {
  eq: '=',
  ne: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  in: 'IN',
};

const opRegExp = /^(.+)__(.+)$/;
const defaultOp = '=';

const getOperator = (name) => {
  if (!(name in ops)) {
    throw new TypeError(`Unknown operator - ${name}`);
  }
  return ops[name];
};

export default (qb, attributes) => {
  for (const key of Object.keys(attributes)) {
    if (opRegExp.test(key)) {
      const [ ,field, op] = opRegExp.exec(key);
      const operator = getOperator(op);
      if (operator === 'IN') {
        qb.whereIn(field, operator, attributes[key]);
      } else {
        qb.where(field, operator, attributes[key]);
      }
    } else {
      qb.where(key, defaultOp, attributes[key]);
    }
  }
};
