export class Redis {
  get = jest.fn();
  set = jest.fn();
  del = jest.fn();
  hget = jest.fn();
  hset = jest.fn();
  hdel = jest.fn();
  hgetall = jest.fn();
  pipeline = jest.fn();
  scan = jest.fn();
  sadd = jest.fn();
  srem = jest.fn();
  zadd = jest.fn();
  zrangebyscore = jest.fn();
  lpush = jest.fn();
  rpush = jest.fn();
  lrange = jest.fn();
  llen = jest.fn();
  exists = jest.fn();
  eval = jest.fn();
  expire = jest.fn();
  publish = jest.fn();
  subscribe = jest.fn();
  on = jest.fn();
  quit = jest.fn();
  disconnect = jest.fn();
}

export default Redis;
