import {api} from './api';
import {transfer} from './order';
import createKeyring from './krp';

describe('Crust api ', () => {
  it('api status', async done => {
    const _api = await api.isReadyOrError;
    const fileInfo = await _api.query.market.files(
      'QmWNj1pTSjbauDHpdyg5HQ26vYcNWnubg1JehmwAE9NnU9'
    );
    console.log(JSON.parse(JSON.stringify(fileInfo)));
  });
  it('api status', async done => {
    const seeds = '';
    await api.isReadyOrError;
    const krp = createKeyring(seeds);
    await transfer(
      api,
      krp,
      '1000000000000',
      '5ERjxKzahHGh3p2R8khBFmjQdjMRfFjcMYuGNqKXBxGW7d6u'
    );
  });
});
