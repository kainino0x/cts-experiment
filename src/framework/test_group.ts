import { CaseRecorder, GroupRecorder, IResult } from "./logger.js";
import { IParamsAny, IParamsSpec } from "./params/index.js";

type TestFn<F extends Fixture> = (this: F) => (Promise<void> | void);
interface ICase {
  name: string;
  params?: object;
  run: (log: CaseRecorder) => (Promise<void> | void);
}
interface IRunCase {
  name: string;
  params?: object;
  run: () => Promise<IResult>;
}
type IFixtureClass<F extends Fixture> = new(log: CaseRecorder, params: IParamsAny) => F;

export abstract class Fixture {
  public params: IParamsAny;
  // TODO: This is called _rec because it's supposed to be invisible to tests,
  // but can't actually be since tests have 'this' bound to the fixture.
  // Probably should not bind, and instead just pass an arg.
  //
  // TODO: If that, then also remove only-arrow-functions from tslint.json.
  // tslint:disable-next-line variable-name
  protected _rec: CaseRecorder;

  public constructor(log: CaseRecorder, params: IParamsAny) {
    this._rec = log;
    this.params = params;
  }

  public log(msg: string) {
    this._rec.log(msg);
  }
}

export class DefaultFixture extends Fixture {
  public warn(msg?: string) {
    this._rec.warn(msg);
  }

  public fail(msg?: string) {
    this._rec.fail(msg);
  }

  public ok(msg?: string) {
    if (msg) {
      this.log("OK: " + msg);
    } else {
      this.log("OK");
    }
  }

  public expect(cond: boolean, msg?: string) {
    if (cond) {
      this.ok(msg);
    } else {
      this._rec.fail(msg);
    }
  }
}

export class TestGroup {
  private tests: ICase[] = [];

  public constructor() {
  }

  public testpf<F extends Fixture>(name: string,
                                   params: IParamsSpec,
                                   fixture: IFixtureClass<F>,
                                   fn: TestFn<F>): void {
    return this.testImpl(name, params, fixture, fn);
  }

  public testf<F extends Fixture>(name: string, fixture: IFixtureClass<F>, fn: TestFn<F>): void {
    return this.testImpl(name, undefined, fixture, fn);
  }

  public testp(name: string, params: IParamsSpec, fn: TestFn<DefaultFixture>): void {
    return this.testImpl(name, params, DefaultFixture, fn);
  }

  public test(name: string, fn: TestFn<DefaultFixture>): void {
    return this.testImpl(name, undefined, DefaultFixture, fn);
  }

  public * iterate(log: GroupRecorder): Iterable<IRunCase> {
    for (const t of this.tests) {
      const [res, rec] = log.record(t.name, t.params);
      yield {name: t.name, params: t.params, run: async () => {
        rec.start();
        await t.run(rec);
        rec.finish();
        return res;
      }};
    }
  }

  private testImpl<F extends Fixture>(name: string,
                                      params: (IParamsSpec | undefined),
                                      fixture: IFixtureClass<F>,
                                      fn: TestFn<F>): void {
    const n = params ? (name + "/" + JSON.stringify(params)) : name;
    const p = params ? params : {};
    this.tests.push({ name: n, run: (log) => {
      const inst = new fixture(log, p);
      return fn.call(inst);
    }});
  }
}