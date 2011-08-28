module.exports = {
  server: {
    host: 'localhost:3000',
  },
  session: {
    secret: 'taboutmotherfucker'
  },
  auth: {
    twitter: {
        consumerKey: 'A7GsoR8MpzXowGRmXoEsw'
      , consumerSecret: 'B18mWyRCJeZwOUFYHpOAmG9ZcjHW7SXvL9Bs76UUqPQ'
    }
  },
  mongodb: {
    url: 'mongodb://tabout:tabout@staff.mongohq.com:10036/tabout'
    //url: 'mongodb://localhost/tabout'
  }
};
