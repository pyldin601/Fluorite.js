import { createNamespace } from 'continuation-local-storage';

const ns = createNamespace('foo');

const foo = async () => ns.get('foo');

const transaction = async (callback) => {
  return callback();
};

describe('cls', () => {
  it('cls sync', () => {
    ns.runAndReturn(async () => {
      ns.set('foo', 'bar');
      console.log(await foo());
      console.log(await ns.runAndReturn(async () => {
        ns.set('foo', 'baz');
        return foo();
      }));
    });
    console.log(ns);
  });
});
