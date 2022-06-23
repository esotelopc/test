# -*- coding: utf-8 -*-

from odoo import api, fields, models


class knowsystem_tour_user(models.Model):
    """
    The model to keep progress of tours by users
    """
    _name = "knowsystem.tour.user"
    _description = "User Progress"

    @api.depends("current_article_id", "tour_id.tour_article_ids", "tour_id.tour_article_ids.done_by_user_ids")
    def _compute_left_article_ids(self):
        """
        Compute method for left_article_ids

        Extra info:
         * fields are not stored since for each user articles are different based on rights
         * the progress is individual: if a user doesn't have an access to the article it is not calced. Ex:
           >> Tour: 1,2,3,4,5
           >> user1 has an access to 1,2,3 and read 1, 2: the progress is 2/3 = 66%
           >> user2 has an access to all and read also 1,2: the progress  is 2/5 = 40%
        """
        for tour_user in self:
            tour_id = tour_user.tour_id
            user_id = tour_user.user_id
            try:
                user_av_articles = tour_id.with_user(user=user_id).tour_article_ids
            except:
                user_av_articles = False
            if user_av_articles:
                left = [article.id for article in user_av_articles if user_id.id not in article.done_by_user_ids.ids]
                tour_user.left_article_ids = [(6, 0, left)]
                total = len(user_av_articles)
                tour_user.progress = ((total - len(left)) * 100) / total
            else:
                tour_user.left_article_ids = [(6, 0, [])]
                tour_user.progress = 0

    user_id = fields.Many2one(
        "res.users",
        string="User",
    )
    tour_id = fields.Many2one(
        "knowsystem.tour",
        string="Tour"
    )
    left_article_ids = fields.Many2many(
        "knowsystem.tour.article",
        "knowsystem_tour_knowsystem_tour_article_rel_table",
        "knowsystem_tour_rel_id",
        "knowsystem_tour_article_rel_id",
        string="Articles to do",
        compute=_compute_left_article_ids,
        store=False,
    )
    progress = fields.Float(
        string="Progress",
        compute=_compute_left_article_ids,
        store=False,
    )
    current_article_id = fields.Many2one(
        "knowsystem.tour.article",
        string="Current article",
    )

    _order = "id"

    def _move_to_the_next_article(self):
        """
        The method to find the next article

        Methods:
         * update_number_of_views

        Returns:
         * the starting page if the tour is done

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        articles = self.tour_id.tour_article_ids
        current_index = articles.ids.index(self.current_article_id.id) + 1
        if len(articles) >= current_index + 1:
            self.sudo().current_article_id = articles[current_index]
            related_article = articles[current_index].article_id
            related_article.update_number_of_views()
        else:
            return self.tour_id.return_start_page()

    def _move_to_the_previous_article(self):
        """
        The method to find the previous article

        Methods:
         * update_number_of_views

        Returns:
         * the starting page if come back to start

        Extra info:
         * Expected singleton
        """
        self.ensure_one()
        articles = self.tour_id.tour_article_ids
        current_index = articles.ids.index(self.current_article_id.id) - 1
        if current_index != -1:
            self.sudo().current_article_id = articles[current_index]
            related_article = articles[current_index].article_id
            related_article.update_number_of_views()
        else:
            return self.tour_id.return_start_page()
