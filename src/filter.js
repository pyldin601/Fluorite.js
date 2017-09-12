/*
 * Copyright (c) 2017 Roman Lakhtadyr
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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

export default (attributes, table) => (qb) => {
  for (const key of Object.keys(attributes)) {
    if (opRegExp.test(key)) {
      const [, field, op] = opRegExp.exec(key);
      const operator = getOperator(op);
      if (operator === 'IN') {
        qb.whereIn(`${table}.${field}`, attributes[key]);
      } else {
        qb.where(`${table}.${field}`, operator, attributes[key]);
      }
    } else {
      qb.where(`${table}.${key}`, defaultOp, attributes[key]);
    }
  }
};
