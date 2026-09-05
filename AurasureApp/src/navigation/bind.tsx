import React from 'react';

/**
 * The app's screens are typed against a small, hand-written navigation surface
 * (`Nav` / `Route<T>` in `./types`) so every component stays testable and the
 * route table is one file. React Navigation hands each screen its own props
 * object; this binder is the single place where those props are forwarded,
 * which keeps the two type systems from leaking into every screen.
 */
type LooseProps = { navigation?: unknown; route?: { params?: object } };

export function AppScreen<C>(Screen: C): React.ComponentType<LooseProps> {
  const Inner = Screen as React.ComponentType<LooseProps>;
  const Bound = (props: LooseProps): React.ReactElement => <Inner navigation={props.navigation} route={props.route} />;
  Bound.displayName = `bind(${(Screen as { displayName?: string; name?: string }).displayName ?? (Screen as { name?: string }).name ?? 'Screen'})`;
  return Bound;
}
