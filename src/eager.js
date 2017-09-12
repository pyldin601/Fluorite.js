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


/*
 {
   table: "users",
   columns: ["id", "name"],
   relations: {
     things: {
       table: "things",
       columns: ["id", "title"],
       relations: {}
     },
     place: {
       table: "places",
       columns: ["id", "place"]
       relations: {
         address: {
           table: "addresses",
           columns: ["id", "address"]
         }
       }
     }
   }
 }

 const usersWithRelations = await User.objects.with('things', 'place.address');
*/

import { isNil, isFunction } from 'lodash';

export const createModelRelationsMap = (ModelClass, relations = []) => {
  const model = new ModelClass();

  return {
    table: ModelClass.table,
    columns: ModelClass.columns,
    relations: relations.reduce((acc, relation) => {
      const [head, tail] = relation.split('.', 2);
      const rest = isNil(tail) ? [] : [tail];

      if (!(head in model)) {
        throw new Error(`Relation "${head}" does not described in the model "${ModelClass.name}"`);
      }

      if (!isFunction(model[head])) {
        throw new Error(`Relation "${head}" is not valid`);
      }

      const relationQuery = model[head]();

      if (isNil(relationQuery) || !('modelClass' in relationQuery)) {
        throw new Error(`Relation "${head}" does not contain related model class`);
      }

      return {
        ...acc,
        [head]: createModelRelationsMap(relationQuery.modelClass, rest),
      };
    }, {}),
  };
};
