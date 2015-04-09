clear
ls
apt-get install dovecot-common dovecot-imapd dovecot-pop3d
clear
groupadd email -g 7788
clear
useradd email -r -g 7788 -u 7788 -d /var/email -m -c 'mail user'
clear
nano /etc/postfix/main.cf 
clear
exit
echo 'Hello world' | mail -s 'Subject line' termiosx@gmail.com
nano /etc/passwd
nano /var/email
clear
nano /etc/passwd
clear
nano generic
postmap generic
service postfix restart
clear
echo 'Hello world' | mail -s 'Wassguud' termiosx@gmail.com
clear
nano /etc/aliases
clear
newaliases 
clear
service postfix restart
clear
echo 'testing' | mail -s 'testing' termiosx@gmail.com
clear
cat /var/log/mail.log
clear
nano generic
clear
nano /etc/aliases
clear
newaliases 
clear
service postfix restart
clear
locate sendmail
clear
updatedb
clear
locate sendmail
clear
nano /etc/mail/sendmail.mc
clear
nano /etc/mail/aliases
nano /etc/mail/submit.mc
clear
service sendmail status
service sendmail restart
clear
service dovecot restart
clear
service postfix restart
clear
echo 'test' | mail -s 'Testing again' termiosx@gmail.com
clear
nano /etc/aliases
newaliases 
clear
service postfix restart
clear
echo 'test' | mail -s 'Testing again' termiosx@gmail.com
nano generic
clear
nano /etc/mail/aliases
clear
newaliases 
service postfix restart
clear
echo 'test' | mail -s 'Testing again' termiosx@gmail.com
nano main.cf 
nano canonical
postmap canonical
clear
service postfix restart
clear
nano canonical
clear
postmap canonical
clear
service postfix restart
clear
echo 'hello world' | mail -s 'Subject' termiosx@gmail.com
clear
cat /var/log/mail.log
clear
ls
clear
nano canonical
clear
postmap canonical
clear
service postfix restart
clear
echo 'testing' | mail -s 'subject' termiosx@gmail.com
clear
cat /var/log/mail.log
clear
nano main.cf 
clear
service postfix restart
clear
echo 'testing' | mail -s 'subject' termiosx@gmail.com
cat /var/log/mail.log
clear
nano /etc/mail/sendmail.mc
clear
cd /etc/mail
clear
ls
clear
make
service sendmail reload
clear
echo 'testing' | mail -s 'subject' termiosx@gmail.com
clear
nano /etc/aliases
clear
newaliases 
clear
nano /etc/host
clear
nano sendmail.cf
clear
nano sendmail.mc
clear
make
clear
nano sendmail.cf
clear
service sendmail reload
clear
echo 'mail' | mail -s 'thisasubject' termiosx@gmail.com
clear
nano sendmail.cf
clear
service postfix restart
cllear
clear
nano /etc/passwd
clear
echo 'heller' | mail -s 'bro' termiosx@gmail.com
clear
nano /etc/passwd
clear
echo 'heller' | mail -s 'bro' termiosx@gmail.com
clear
echo 'heller' | mail -s 'bro' termiosx@gmail.com
echo 'heller' | mail -s 'again' termiosx@gmail.com
echo 'heller' | mail -s 'again' lukeymoo@hotmail.com
echo 'heller' | mail -s 'again' termiosx@gmail.com
clear
echo 'heller' | mail -s 'again' termiosx@gmail.com
echo 'Welcome to the DMV Exchange' | mail -s 'DMV Exchange - Registration' termiosx@gmail.com
clear
echo 'Welcome to the DMV Exchange' | mail -s 'DMV Exchange - LRegistration' termiosx@gmail.com
clear
nslookup dmv-exchange.com
clear
ping 64.207.128.222
clear
whois 64.207.128.222
clear
nslookup 64.207.128.222
clear
nslookup dmv-exchange.com
clear
ls
cd /etc/postfix/
clear
ls
clear
ls
nano main.cf
clear
dovecot
clear
host dmv-exchange.com
host 72.47.237.205
clear
host 72.47.237.205
clear
service postfix restart
clear
service sendmail restart
clear
service dovecot restart
clear
nano master.cf 
clear
nano main.cf
clear
postconf -a
clear
nano main.cf
clear
ls
cd sasl/
ls
clear
nano smtpd.conf 
clear
nano /etc/resolv.conf 
clear
nano /etc/hosts
clear
nano /etc/host
clear
nano /etc/resolv.conf 
clear
netstat -anp | grep 25
clear
netstat -anp | grep 587
clear
cat /var/log/mail.log
clear
locate dovecot
clear
locate dovecot | head
clear
locate dovecot | head
locate dovecot | less
clear
dovecot
clear
cd /
clear
apt-get install dovecot
clear
apt-cache search dovecot
apt-get install dovecot-core
apt-get autoremove dovecot-core
clear
apt-get install dovecot
clear
apt-get install dovecot-core
apt-get autoremove dovecot-core
clear
dpkg -P dovecot-common
clear
dpkg -P dovecot-core
clear
apt-get install dovecot-core
clear
nano /etc/postfix/main.cf
clear
nano /etc/dovecot/dovecot.conf 
clear
echo 'testing dovecot config' | mail -s 'Subjectline' termiosx@gmail.com
clear
dovecot 
clear
dovecot
clear
cat /var/log/mail.log
clear
cat /var/log/mail.log
clear
ls -l /var/spool/postfix/
ls -l /var/spool/postfix/private/
clear
postconf -n
clear
tail /var/mail/mail.err
tail /var/log/mail.err
clear
dovecot -n
clear
cd /etc/dovecot/
clear
ls
cd private/
ls
cat dovecot.pem 
cd ..
clear
ls
cd conf.d/
ls
cd ..
clear
ls
clear
nano dovecot.conf 
clear
service dovecot reload
service dovecot restart
clear
cat /var/log/mail.err
clear
dovecot -n
clear
ls
nano dovecot.conf 
clear
cd conf.d/
clear
ls
cat 10-auth.conf 
clear
ls
nano 10-master.conf 
clear
cd ..
clear
service dovecot restart
clear
ls /var/spool/postfix/private/auth 
clear
nano conf.d/10-master.conf 
clear
ls
nano dovecot.conf 
clear
service postfix restart
clear
ls
clear
cd /var/mail
clear
ls
cat root 
echo 'Testing' | mail -s 'Test for root' no-reply@dmv-exchange.com
clear
ls
cat root 
clear
cat /var/log/mail.log
clear
ls
cat smmsp 
clear
tail ss
clear
ls
tail root
clear
tail smmsp
clear
ls
cat smmsp 
clear
cd /etc/postfix/
clear
ls
cat vmail_mailbox
clear
nano main.cf 
clear
ls /var/email
clear
nano main.cf
clear
nano vmail_mailbox
clear
postmap vmail_mailbox
service postfix restart
clear
echo 'Another test' | mail -s 'This is a subject' no-reply@dmv-exchange.com
clear
ls /var/email/
cat /var/mail/root 
cat /var/mail/smmsp 
clear
ls
nano vmail_mailbox
postmap vmail_mailbox
clear
service postfix restart
clear
nano main.cf
clear
cat vmail_domains
clear
nano main.cf
clear
nano vmail_aliases
clear
nano canonical
clear
cat /etc/mailname 
clear
cat /etc/aliases
nano /etc/aliases
clear
newaliases 
clear
service postfix restart
clear
service dovecot reload
clear
echo 'testing again' | mail -s 'subjectline' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
nano /etc/aliases
clear
newaliases 
clear
cat /dev/null > /var/log/mail.log
clear
cat /var/log/mail.log
clear
service postfix restart
clear
echo 'Testing postfix' | mail -s 'subject' no-reply@dmv-exchange.com
cat /var/log/mail.log
clear
nano main.cf
clear
ls
cat vmail_mailbox
locate dmv-exchange.com
updatedb
locate dmv-exchange.com
clear
cat /var/log/mail.log 
clear
ls
nano main.cf
clear
cat canonical
clear
ls
nano vmail_mailbox
clear
cat /var/log/mail.log
clear
cat /dev/null > /var/log/mail.log
clear
service postfix restart
clear
echo 'sendmail' | mail -s 'Local' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log 
cat /dev/null > /var/log/mail.log
clear
echo 'sendmail' | mail -s 'Local' no-reply@dmv-exchange.com
cat /var/log/mail.log 
service postfix status
clear
service postfix restart
clear
cat /dev/null > /var/log/mail.log
clear
echo 'ok' | mail -s 'subject' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
service dovecot restart
echo 'ok' | mail -s 'subject' no-reply@dmv-exchange.com
cat /var/log/mail.log
clear
cat /var/log/mail.log
clear
cat /var/log/mail.log
clear
ls
nano main.cf
clear
service postfix restart
service dovecot restart
clear
nano /etc/dovecot/dovecot.conf 
clear
nano /etc/dovecot/conf.d/10-master.conf 
clear
service dovecot restart
clear
cat /dev/null > /var/log/mail.log
clear
echo 'testing' | mail -s 'test' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
clear
nanclear
ls
clear
nano master.cf
clear
users
clear
nano master.cf
clear
service postfix restart
clear
service dovecot restart
cat /dev/null > /var/log/mail.log
clear
echo 'ok' | mail -s 'subject' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log 
nano master.cf 
clear
service postfix restart
cat /dev/null > /var/log/mail.log
clear
echo 'ok' | mail -s 'subject' no-reply@dmv-exchange.com
nano master.cf 
cat /var/log/mail.log 
cat /dev/null > /var/log/mail.log
nano master.cf 
clear
service postfix reload
clear
echo 'ok' | mail -s 'subject' no-reply@dmv-exchange.com
cat /var/log/mail.log 
clear
nano master.cf 
clear
service postfix reload
clear
echo 'test' | mail -s 'outsider' termiosx@gmail.com
clear
echo 'testing local' | mail -s 'localmail' no-reply@dmv-exchange.com
cat /var/log/mail.log
clear
dovecot -n
clear
nano master.cf
clear
cd /etc/dovecot/
clear
ls
nano dovecot.conf 
cd conf.d/
clear
ls
nano 10-auth.conf 
nano 10-master.conf 
nano auth-passwdfile.conf.ext 
cd ..
clear
ls
ls -a
clear
echo '$USER: {PLAIN}test' > test
clear
ls
cat test 
rm test 
clear
echo '$USER: {PLAIN}omgerrd' > password
clear
nano /etc/postfix/master.cf 
clear
service postfix reload
clear
echo 'testing mail' | mail -s 'local' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log 
clear
dove
dovecot
clear
dovecot -n
passwd
clear
cat /etc/passwd
nano /etc/postfix/master.cf 
clear
service postfix reload
clear
service postfix reload
echo 'test local' | mail -s 'subject' no-reply@dmv-exchange.com
cat /var/log/mail.log
clear
users
groups
clear
useradd vmail
groupadd vmail
clear
users
cut
clear
cut -d: -f1 /etc/group
clear
nano /etc/postfix/master.cf 
clear
service postfix reload
clear
echo 'testing local' | mail -s 'local subject' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
clear
ls /usr/lib/dovecot/
clear
cat /var/log/mail.log 
clear
nano /etc/postfix/master.cf 
clear
service postfix reload
clear
echo 'ok' | mail -s 'subject' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log 
ls /usr/lib/dovecot/
clear
postfix -e virtual_transport=dovecot
clear
postconf -e virtual_transport=dovecot
postconf -e dovecot_destination_recipient_limit=1
clear
nano /etc/postfix/master.cf 
clear
nano /etc/postfix/master.cf
clear
service dovecot reload
service postfix reload
clear
echo 'ok' | mail -s 'ok' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
clear
ls -l /usr/lib/dovecot/
clear
chown /usr/lib/dovecot/deliver 
chown vmail /usr/lib/dovecot/deliver 
clear
ls -l /usr/lib/dovecot/
clear
service postfix reload
clear
echo 'permission' | mail -s 'granted' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
clear
cat /dev/null > /var/log/mail.log 
clear
chown root /usr/lib/dovecot/deliver 
clear
cat /etc/users
cat /etc/user
clear
cat /etc/groups
clear
ls
rm password 
clear
ls
clear
cd private/
ls
cat dovecot.pem 
clear
cd ..
clear
ls
clear
ls -l /usr/lib/dovecot/
clear
cat /var/log/mail.log
cat /usr/lib/dovecot/deliver
clear
ls /usr/lib/dovecot/deliver
clear
cat /var/log/mail.log
clear
ls /usr/lib/dovecot/
ls /usr/lib/dovecot/ -l
clear
nano /etc/postfix/master.cf 
clear
service postfix reload
clear
echo 'ok' | mail -s 'subject' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
clear
nano /etc/postfix/master.cf 
clear
postfix reload
clear
service postfix reload
clear
echo 'PRomlb' | mail -s 'omg' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
clear
nano /etc/postfix/master.cf 
clear
service postfix reload
echo 'PRomlb' | mail -s 'omg' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
clear
cat /dev/null > /var/log/mail.log
clear
echo 'PRomlb' | mail -s 'omg' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
nano /etc/postfix/master.cf 
clear
service postfix reload
clear
echo 'PRomlb' | mail -s 'omg' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
clear
nano /etc/postfix/main.cf 
clear
service postfix reload
clear
cat /dev/null > /var/log/mail.log
clear
echo 'ok'  
clear
echo 'ok' | mail -s 'subject' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
clear
jobs
fg %2
clear
ls
clear
cd /
clear
ls
cd ~
clear
ls
clear
ls
cd app.js 
clear
nano app.js 
clear
ls
clear
git init
git add .
clear
git push dx master
clear
ls
clear
npm start
clear
fg %1
clear
ls
mongod
clear
cd bin/
clear
ls
cd /
clear
ls
cd mongo/mongo/
clear
ls
clear
cd bin/
clear
ls
clear
./mongod --fork --logpath /var/log/mongodb.log
clear
ls
clear
ls
clear
ls
ls ..
clear
./mongod --dbpath ../database/ --auth --fork
./mongod --dbpath ../database/ --auth --fork --logpath /var/log/mongodb.log
clear
service mongod
service mongod status
clear
./mongo
clear
./mongo dmvexchange
clear
cd ~
clear
ls
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
jobs
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm install nodemailer-sendmail-transport --save
clear
npm start
clear
locate mail
clear
locate mail | head
clear
/etc/mail/
clear
locate mail
locate mail | less
clear
ls
clear
ls
cd ~
clear
ls
clear
npm start
clear
npm start
clear
npm start
clear
npm uninstall nodemailer --save
npm uninstall nodemailer-sendmail-transport --save
clear
npm install child_process --save
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
echo 'testing' | mail -s 'subject line' lukeymoo@hotmail.com
clear
npm install nodemailer --save
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
npm start
clear
ls
cd /etc/postfix/
clear
ls
nano main.cf
clear
ls
nano vmail_domains
nano vmail_mailbox
clear
nano main.cf
clear
nano vmail_mailbox
postmap vmail_mailbox
clear
service postfix reload
clear
echo 'testing forward' | mail -s 'Subecjt' contact@dmv-exchange.com
cat /var/log/mail.log
clear
nano main.cf
clear
cd /
clear
ls
cd ~
clear
ls
clear
nano .forward
clear
service postfix reload
clear
mail -s 'Testing' contact@dmv-exchange.com
clear
echo 'Test' | mail -s 'subject' contact@dmv-exchange.com
clear
cat /var/log/mail.log
clear
cd /etc/dovecot/conf.d/
clear
ls
clear
nano 10-auth.conf 
nano 10-master.conf 
clear
ls
nano 15-mailboxes.conf 
clear
ls
nano 10-mail.conf 
clear
ls
nano 15-lda.conf 
clear
ls
cd ..
nano dovecot.conf 
clear
cd conf.d/
clear
ls
nano 10-auth.conf 
nano auth-master.conf.ext 
clear
nano 10-auth.conf 
cat 10-auth.conf 
clear
ls
cd ..
clear
ls
nano dovecot.conf 
dovecot -n
nano dovecot.conf 
clear
nano dovecot.conf 
clear
cd /etc/postfix/
clear
ls
nano main.cf 
clear
nano /etc/aliases
newaliases 
service postfix reload
echo 'testing' | mail -s 'subject' termiosx@gmail.com
clear
nano /etc/aliases
clear
newaliases 
clear
service postfix reload
clear
echo 'testing' | mail -s 'subject' no-reply@dmv-exchange.com
clear
cat /var/log/mail.log
clear
nano main.cf
clear
service postfix reload
clear
echo 'testing' | mail -s 'subject' no-reply@dmv-exchange.com
nano main.cf
clear
service postfix reload
clear
cat main.cf 
clear
echo 'testing' | mail -s 'subject' no-reply@dmv-exchange.com
cat /var/log/mail.log
clear
nano main.cf 
clear
nano master.cf 
clear
nano main.cf 
clear
cat /var/email/.profile 
clear
ls
clear
service postfix reload
clear
cat /var/log/mail.log
clear
nano /etc/aliases
newaliases 
clear
service postfix reload
clear
cat /var/log/mail.log
clear
nano main.cf
clear
nano master.cf 
clear
nano /etc/dovecot/dovecot.conf 
cd /etc/dovecot/conf.d/
clear
ls
nano 15-mailboxes.conf 
nano 15-lda.conf 
nano auth-deny.conf.ext 
clear
nano 10-auth.conf 
nano auth-master.conf.ext 
clear
cat auth-master.conf.ext 
cd ..
clear
ls
nano dovecot.pem 
nano dovecot.conf 
clear
cd conf.d/
clea
rls
clear
ls
nano auth-passwdfile.conf.ext 
ls /etc/dovecot/users
clear
cd /etc/postfix/
clear
ls
nano main.cf
nano vin
postmap bin
clear
postmap vin
clear
service postfix reload
clear
cat /var/log/mail.log 
clear
nano vin
clear
postmap vin
clear
service postfix reload
clear
postmap vin
nano vin
clear
postmap vin
clear
service postfix reload
clear
ls
nhup npm start 
nohup npm start
clear
ls
cat nohup.out 
rm nohup.out 
clear
nohup npm start &
clear
exit
clear
ls
clear
exit
clear
nano public/css/common/common.css 
