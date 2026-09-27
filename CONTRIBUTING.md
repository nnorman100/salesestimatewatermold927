# Contributing

Welcome! This is the **Alert Disaster Restoration field-scoping copilot**, a sandboxed restoration estimator that turns technician dictation, meter readings, and photos into standardized scopes. We're glad you're here; fixes and improvements from outside contributors are welcome.

## Dev quickstart

```sh
npm install
npm run dev     # start the development server
npm test        # run the test scripts
npm run build    # production build
npm run lint     # lint the code
```

## The no-mistakes pipeline

Changes ship through the `no-mistakes` pipeline, which is the gate for every push. The gate agent is pinned to `pi` via `.no-mistakes.yaml`. Push your branch through the gate, not directly to `origin`; the gate runs review, tests, docs, and lint before anything lands.

## Be respectful, ship working code

Be respectful to other contributors, and ship working code.