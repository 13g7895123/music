<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateUserApiTokensTable extends Migration
{
    public function up()
    {
        if ($this->db->tableExists('user_api_tokens')) {
            return;
        }

        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'user_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'token_hash' => [
                'type' => 'CHAR',
                'constraint' => 64,
                'comment' => 'SHA-256(token)',
            ],
            'token_prefix' => [
                'type' => 'VARCHAR',
                'constraint' => 16,
                'comment' => '顯示用前綴',
            ],
            'last_used_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('user_id', 'unique_user_id');
        $this->forge->addUniqueKey('token_hash', 'unique_token_hash');
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE', 'fk_user_api_tokens_user_id');
        $this->forge->createTable('user_api_tokens', true);
    }

    public function down()
    {
        $this->forge->dropTable('user_api_tokens', true);
    }
}
