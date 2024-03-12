import {Observable, OperatorFunction, pipe, UnaryFunction} from "rxjs";
import { filter } from "rxjs/operators";

export function filterNullish<T>(): UnaryFunction<Observable<T|null|undefined>, Observable<T>> {
  return pipe(
    filter(s => s !== null && s !== undefined) as OperatorFunction<T|null|undefined, T>
  );
}
